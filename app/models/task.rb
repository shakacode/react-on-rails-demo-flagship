class Task < ApplicationRecord
  STATUSES = %w[todo doing done].freeze

  validates :title, presence: true, length: { maximum: 120 }
  validates :status, inclusion: { in: STATUSES }

  scope :ordered, -> { order(:position, :id) }

  # Shape consumed by the Redux Toolkit store on the client and by the
  # server-rendered TasksApp component. Keep keys camelCased for JS.
  def as_props
    {
      id:,
      title:,
      notes:,
      status:,
      position:,
      updatedAt: updated_at.iso8601
    }
  end
end
